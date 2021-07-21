import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnswerPostComponent } from 'app/shared/metis/answer-post/answer-post.component';
import { MockPipe } from 'ng-mocks';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HtmlForMarkdownPipe } from 'app/shared/pipes/html-for-markdown.pipe';
import { AnswerPost } from 'app/entities/metis/answer-post.model';

chai.use(sinonChai);
const expect = chai.expect;

describe('AnswerPostComponent', () => {
    let component: AnswerPostComponent;
    let fixture: ComponentFixture<AnswerPostComponent>;

    const answerPost = {
        id: 2,
        creationDate: undefined,
        content: 'content',
        tutorApproved: false,
    } as AnswerPost;

    beforeEach(async () => {
        return TestBed.configureTestingModule({
            imports: [],
            declarations: [AnswerPostComponent, MockPipe(HtmlForMarkdownPipe)],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [],
        })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(AnswerPostComponent);
                component = fixture.componentInstance;
            });
    });

    it('should contain a header', () => {
        const header = fixture.debugElement.nativeElement.querySelector('jhi-answer-post-header');
        expect(header).to.exist;
    });

    it('should contain a div with markdown content', () => {
        const header = fixture.debugElement.nativeElement.querySelector('div.markdown-preview');
        expect(header).to.exist;
    });

    it('should contain a footer', () => {
        const footer = fixture.debugElement.nativeElement.querySelector('jhi-answer-post-footer');
        expect(footer).to.exist;
    });

    it('should have correct content', () => {
        component.posting = answerPost;
        component.ngOnInit();
        expect(component.content).to.be.equal(answerPost.content);
    });
});
