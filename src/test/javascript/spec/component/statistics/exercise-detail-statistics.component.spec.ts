import * as chai from 'chai';
import { ChartsModule } from 'ng2-charts';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import sinonChai from 'sinon-chai';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArtemisTranslatePipe } from 'app/shared/pipes/artemis-translate.pipe';
import { MockComponent, MockPipe } from 'ng-mocks';
import { ArtemisTestModule } from '../../test.module';
import { MockSyncStorage } from '../../helpers/mocks/service/mock-sync-storage.service';
import { Exercise } from 'app/entities/exercise.model';
import { MockRouter } from '../../helpers/mocks/mock-router';
import { Router } from '@angular/router';
import { MockRouterLinkDirective } from '../lecture-unit/lecture-unit-management.component.spec';
import { ExerciseDetailStatisticsComponent } from 'app/exercises/shared/statistics/exercise-detail-statistics.component';
import { ExerciseManagementStatisticsDto } from 'app/exercises/shared/statistics/exercise-management-statistics-dto';
import { DoughnutChartComponent } from 'app/exercises/shared/statistics/doughnut-chart.component';

chai.use(sinonChai);
const expect = chai.expect;

describe('ExerciseDetailStatisticsComponent', () => {
    let fixture: ComponentFixture<ExerciseDetailStatisticsComponent>;
    let component: ExerciseDetailStatisticsComponent;

    const exercise = {
        id: 1,
        course: {
            id: 2,
        },
    } as Exercise;

    const exerciseStatistics = {
        averageScoreOfExercise: 50,
        maxPointsOfExercise: 10,
        absoluteAveragePoints: 5,
        scoreDistribution: [5, 0, 0, 0, 0, 0, 0, 0, 0, 5],
        numberOfExerciseScores: 10,
        numberOfParticipations: 10,
        numberOfStudentsOrTeamsInCourse: 10,
        participationsInPercent: 100,
        numberOfPosts: 4,
        numberOfResolvedPosts: 2,
        resolvedPostsInPercent: 50,
    } as ExerciseManagementStatisticsDto;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ArtemisTestModule, ChartsModule],
            declarations: [ExerciseDetailStatisticsComponent, MockPipe(ArtemisTranslatePipe), MockRouterLinkDirective, MockComponent(DoughnutChartComponent)],
            providers: [
                { provide: Router, useClass: MockRouter },
                { provide: LocalStorageService, useClass: MockSyncStorage },
                { provide: SessionStorageService, useClass: MockSyncStorage },
            ],
        })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(ExerciseDetailStatisticsComponent);
                component = fixture.componentInstance;
            });
    });

    beforeEach(() => {
        component.exercise = exercise;
        component.doughnutStats = exerciseStatistics;
    });

    it('should initialize chart data', () => {
        fixture.detectChanges();
        expect(component.doughnutStats.absoluteAveragePoints).to.equal(5);
        expect(component.doughnutStats.participationsInPercent).to.equal(100);
        expect(component.doughnutStats.resolvedPostsInPercent).to.equal(50);
    });
});
