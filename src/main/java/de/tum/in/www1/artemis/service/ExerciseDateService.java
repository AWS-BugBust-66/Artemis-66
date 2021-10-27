package de.tum.in.www1.artemis.service;

import java.time.ZonedDateTime;
import java.util.Optional;

import org.springframework.stereotype.Service;

import de.tum.in.www1.artemis.domain.Exercise;
import de.tum.in.www1.artemis.domain.participation.Participation;
import de.tum.in.www1.artemis.repository.ExerciseRepository;
import de.tum.in.www1.artemis.repository.ParticipationRepository;
import de.tum.in.www1.artemis.service.exam.ExamDateService;
import de.tum.in.www1.artemis.web.rest.errors.EntityNotFoundException;

@Service
public class ExerciseDateService {

    private final ExerciseRepository exerciseRepository;

    private final ParticipationRepository participationRepository;

    private final ExamDateService examDateService;

    public ExerciseDateService(ExerciseRepository exerciseRepository, ParticipationRepository participationRepository, ExamDateService examDateService) {
        this.exerciseRepository = exerciseRepository;
        this.participationRepository = participationRepository;
        this.examDateService = examDateService;
    }

    /**
     * Finds the latest individual due date for participants. If no individual due dates exist, then the exercise due date is returned.
     *
     * Returns nothing if the exercise itself has no due date.
     * @param exerciseId of the exercise for which the latest due date should be returned.
     * @return the latest individual due date, or if not existing the exercise due date.
     * @throws EntityNotFoundException if no exercise with the given id can be found.
     */
    public Optional<ZonedDateTime> getLatestIndividualDueDate(Long exerciseId) {
        final Exercise exercise = exerciseRepository.findByIdElseThrow(exerciseId);
        return getLatestIndividualDueDate(exercise);
    }

    /**
     * Finds the latest individual due date for participants. If no individual due dates exist, then the exercise due date is returned.
     *
     * Returns nothing if the exercise itself has no due date.
     * @param exercise the exercise for which the latest due date should be returned.
     * @return the latest individual due date, or if not existing the exercise due date.
     */
    public Optional<ZonedDateTime> getLatestIndividualDueDate(Exercise exercise) {
        if (exercise.getDueDate() == null) {
            // early exit to avoid database call, same result would be produced
            // in Optional.ofNullable(exercise.getDueDate()) below
            return Optional.empty();
        }
        return participationRepository.findLatestIndividualDueDate(exercise.getId()).or(() -> Optional.ofNullable(exercise.getDueDate()));
    }

    /**
     * Checks if submissions are no longer possible.
     *
     * Checks for exam or course exercise, and if an individual due date is set for the given participation or only a course-wide due date applies.
     * @param participation in a course or exam exercise.
     * @return true, if the due date is in the past and submissions are no longer possible.
     */
    public boolean isAfterDueDate(Participation participation) {
        final Exercise exercise = participation.getExercise();
        if (exercise.isExamExercise()) {
            return examDateService.isExerciseWorkingPeriodOver(exercise);
        }

        final ZonedDateTime now = ZonedDateTime.now();
        return getDueDate(participation).map(now::isAfter).orElse(false);
    }

    /**
     * Checks if the due date for the given participation is in the future.
     * @param participation in a course or exam exercise.
     * @return true, if the due date has not yet passed.
     */
    public boolean isBeforeDueDate(Participation participation) {
        return !isAfterDueDate(participation);
    }

    /**
     * Checks if the current time is before the latest possible submission time.
     *
     * If no due date is set, returns true (a due date infinitely far in the future is assumed).
     * @param exercise for which this should be checked.
     * @return true, if the current time is before the due date.
     */
    public boolean isBeforeLatestDueDate(Exercise exercise) {
        final ZonedDateTime now = ZonedDateTime.now();
        return getLatestIndividualDueDate(exercise).map(now::isBefore).orElse(true);
    }

    /**
     * Gets either the individual due date for a participation if present or else the exercise due date if present.
     * @param participation of a student in an exercise.
     * @return the individual due date, or the exercise due date, or nothing.
     */
    public Optional<ZonedDateTime> getDueDate(Participation participation) {
        final Exercise exercise = participation.getExercise();

        if (participation.getIndividualDueDate() != null) {
            return Optional.of(participation.getIndividualDueDate());
        }
        else if (exercise.getDueDate() != null) {
            return Optional.of(exercise.getDueDate());
        }
        else {
            return Optional.empty();
        }
    }
}
